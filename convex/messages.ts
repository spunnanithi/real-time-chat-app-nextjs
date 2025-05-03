import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { getUserByClerkId } from "./_utils";

export const get = query({
	args: {
		id: v.id("conversations"),
	},
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

		// Check if the current user is a member of the conversation
		const membership = await ctx.db
			.query("conversationMembers")
			.withIndex("by_memberId_conversationId", (q) =>
				q.eq("memberId", currentUser._id).eq("conversationId", args.id)
			)
			.unique();

		// If the user is not a member of the conversation, deny the action
		if (!membership) {
			throw new ConvexError("You are not a member of this conversation");
		}

		// Fetch all messages for this conversation, ordered from newest to oldest
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_conversationId", (q) => q.eq("conversationId", args.id))
			.order("desc")
			.collect();

		// For each message, fetch the sender's user details and combine with message data
		const messagesWithUsers = await Promise.all(
			messages.map(async (message) => {
				// Get the sender's user object from the database
				const messageSender = await ctx.db.get(message.senderId);

				// If sender is not found, throw an error
				if (!messageSender) {
					throw new ConvexError("Could not find sender of message");
				}

				// Return the message along with the sender's name, image, and whether it was sent by the current user
				return {
					message,
					senderImage: messageSender.imageUrl,
					senderName: messageSender.username,
					isCurrentUser: messageSender._id === currentUser._id,
				};
			})
		);

		// Return the array of enriched messages
		return messagesWithUsers;
	},
});
