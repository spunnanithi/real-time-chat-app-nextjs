import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { getUserByClerkId } from "./_utils";

// Mutation to create a new friend request in the Convex database
export const create = mutation({
	args: {
		email: v.string(), // The email of the user to send a request to
	},
	handler: async (ctx, args) => {
		// Retrieve the identity of the currently authenticated user
		const identity = await ctx.auth.getUserIdentity();

		// Check if the user is authenticated
		if (!identity) {
			throw new ConvexError("Unauthorized");
		}

		// Prevent users from sending a friend request to themselves
		if (args.email === identity.email) {
			throw new ConvexError("Can't send a request to yourself");
		}

		// Fetch the current user from the database using their Clerk ID
		const currentUser = await getUserByClerkId({
			ctx,
			clerkId: identity.subject,
		});

		if (!currentUser) {
			throw new ConvexError("User not found");
		}

		// Find the receiver (the user to whom the friend request will be sent) by their email
		const receiver = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.unique();

		if (!receiver) {
			throw new ConvexError("User could not be found");
		}

		// Check if the current user has already sent a request to the receiver
		const requestAlreadySent = await ctx.db
			.query("requests")
			.withIndex("by_receiver_sender", (q) =>
				q.eq("receiver", receiver._id).eq("sender", currentUser._id)
			);

		if (requestAlreadySent) {
			throw new ConvexError("Request already sent");
		}

		// Check if the receiver has already sent a request to the current user
		const requestAlreadyReceived = await ctx.db
			.query("requests")
			.withIndex("by_receiver_sender", (q) =>
				q.eq("receiver", currentUser._id).eq("sender", receiver._id)
			);

		if (requestAlreadyReceived) {
			throw new ConvexError("This user has already sent you a request");
		}

		// Insert the new friend request into the "requests" table
		const request = await ctx.db.insert("requests", {
			sender: currentUser._id,
			receiver: receiver._id,
		});

		return request;
	},
});
