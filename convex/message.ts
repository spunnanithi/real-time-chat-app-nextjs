import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { getUserByClerkId } from "./_utils";

// Mutation to create and send a new message in a conversation
export const create = mutation({
	args: {
		conversationId: v.id("conversations"), // The ID of the conversation to send the message in
		type: v.string(), // The type of message (e.g., "text", "image", etc.)
		content: v.array(v.string()), // The content of the message (can be multiple strings for multipart messages)
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
				q
					.eq("memberId", currentUser._id)
					.eq("conversationId", args.conversationId)
			)
			.unique();

		// If the user is not a member of the conversation, deny the action
		if (!membership) {
			throw new ConvexError("You are not a member of this conversation");
		}

		// Insert the new message into the "messages" table
		const message = await ctx.db.insert("messages", {
			senderId: currentUser._id,
			...args,
		});

		// Update the conversation to store a reference to the latest message
		await ctx.db.patch(args.conversationId, { lastMessageId: message });

		// Return the newly created message
		return message;
	},
});
