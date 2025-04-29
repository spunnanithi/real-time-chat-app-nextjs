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
			)
			.unique();

		if (requestAlreadySent) {
			throw new ConvexError("Request already sent");
		}

		// Check if the receiver has already sent a request to the current user
		const requestAlreadyReceived = await ctx.db
			.query("requests")
			.withIndex("by_receiver_sender", (q) =>
				q.eq("receiver", currentUser._id).eq("sender", receiver._id)
			)
			.unique();

		if (requestAlreadyReceived) {
			throw new ConvexError("This user has already sent you a request");
		}

		// Query all friends where the current user is stored as user1
		const friends1 = await ctx.db
			.query("friends")
			.withIndex("by_user1", (q) => q.eq("user1", currentUser._id))
			.collect();

		// Query all friends where the current user is stored as user2
		const friends2 = await ctx.db
			.query("friends")
			.withIndex("by_user2", (q) => q.eq("user2", currentUser._id))
			.collect();

		// Check if the receiver is already a friend, regardless of whether
		// the current user is user1 or user2 in the friendship record
		if (
			friends1.some((friend) => friend.user2 === receiver._id) ||
			friends2.some((friend) => friend.user1 === receiver._id)
		) {
			throw new ConvexError("You are already friends with this user");
		}

		// Insert the new friend request into the "requests" table
		const request = await ctx.db.insert("requests", {
			sender: currentUser._id,
			receiver: receiver._id,
		});

		return request;
	},
});

export const deny = mutation({
	args: {
		id: v.id("requests"),
	},
	handler: async (ctx, args) => {
		// Retrieve the identity of the currently authenticated user
		const identity = await ctx.auth.getUserIdentity();

		// Check if the user is authenticated
		if (!identity) {
			throw new ConvexError("Unauthorized");
		}

		// Fetch the current user from the database using their Clerk ID
		const currentUser = await getUserByClerkId({
			ctx,
			clerkId: identity.subject,
		});

		if (!currentUser) {
			throw new ConvexError("User not found");
		}

		const request = await ctx.db.get(args.id);

		if (!request || request.receiver !== currentUser._id) {
			throw new ConvexError("There was an error denying this request");
		}

		await ctx.db.delete(request._id);
	},
});

// Mutation to accept a friend request in the Convex database
export const accept = mutation({
	args: {
		id: v.id("requests"), // The ID of the friend request being accepted
	},
	handler: async (ctx, args) => {
		// Get the currently authenticated user's identity
		const identity = await ctx.auth.getUserIdentity();

		// If no identity found, the user is not authenticated
		if (!identity) {
			throw new ConvexError("Unauthorized");
		}

		// Fetch the current user's record using their Clerk ID
		const currentUser = await getUserByClerkId({
			ctx,
			clerkId: identity.subject,
		});

		// If user record is not found, throw an error
		if (!currentUser) {
			throw new ConvexError("User not found");
		}

		// Fetch the friend request from the database using the provided ID
		const request = await ctx.db.get(args.id);

		// Ensure the request exists and the current user is the intended receiver
		if (!request || request.receiver !== currentUser._id) {
			throw new Error("There was an error accepting this request");
		}

		// Create a new conversation between the two users (not a group chat)
		const conversationId = await ctx.db.insert("conversations", {
			isGroup: false,
		});

		// Add a new record to the "friends" table to officially link the two users
		await ctx.db.insert("friends", {
			user1: currentUser._id,
			user2: request.sender,
			conversationId,
		});

		// Add both users as members of the conversation
		await ctx.db.insert("conversationMembers", {
			memberId: currentUser._id,
			conversationId,
		});
		await ctx.db.insert("conversationMembers", {
			memberId: request.sender,
			conversationId,
		});

		// After accepting, delete the original friend request from the database
		await ctx.db.delete(request._id);
	},
});
