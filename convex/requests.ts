import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import { getUserByClerkId } from "./_utils";

// Convex query to fetch all friend requests received by the currently authenticated user
export const get = query({
	args: {},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity(); // Get the authenticated user's identity

		// Ensure the user is authenticated
		if (!identity) {
			throw new Error("Unauthorized");
		}

		// Fetch the current user's record from the database using their Clerk ID
		const currentUser = await getUserByClerkId({
			ctx,
			clerkId: identity.subject,
		});

		if (!currentUser) {
			throw new ConvexError("User not found");
		}

		// Fetch all requests where the current user is the receiver
		const requests = await ctx.db
			.query("requests")
			.withIndex("by_receiver", (q) => q.eq("receiver", currentUser._id))
			.collect();

		// For each request, fetch the sender's full user record
		const requestsWithSender = await Promise.all(
			requests.map(async (request) => {
				const sender = await ctx.db.get(request.sender); // Fetch sender by ID

				// Ensure the sender exists
				if (!sender) {
					throw new ConvexError("Request sender could not be found");
				}

				// Return an object combining sender info and the original request
				return { sender, request };
			})
		);

		// Return the list of requests along with their sender details
		return requestsWithSender;
	},
});

export const count = query({
	args: {},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity(); // Get the authenticated user's identity

		// Ensure the user is authenticated
		if (!identity) {
			throw new Error("Unauthorized");
		}

		// Fetch the current user's record from the database using their Clerk ID
		const currentUser = await getUserByClerkId({
			ctx,
			clerkId: identity.subject,
		});

		if (!currentUser) {
			throw new ConvexError("User not found");
		}

		// Fetch all requests where the current user is the receiver
		const requests = await ctx.db
			.query("requests")
			.withIndex("by_receiver", (q) => q.eq("receiver", currentUser._id))
			.collect();

		return requests.length;
	},
});
