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

		const conversation = await ctx.db.get(args.id);

		if (!conversation) {
			throw new ConvexError("Conversation not found");
		}

		const membership = await ctx.db
			.query("conversationMembers")
			.withIndex("by_memberId_conversationId", (q) =>
				q.eq("memberId", currentUser._id).eq("conversationId", conversation._id)
			)
			.unique();

		if (!membership) {
			throw new ConvexError("You aren't a member of this conversation");
		}

		const allConversationMemberships = await ctx.db
			.query("conversationMembers")
			.withIndex("by_conversationId", (q) => q.eq("conversationId", args.id))
			.collect();

		if (!conversation.isGroup) {
			const otherMembership = allConversationMemberships.filter(
				(membership) => membership.memberId !== currentUser._id
			)[0];

			const otherMemberDetails = await ctx.db.get(otherMembership.memberId);

			return {
				...conversation,
				otherMember: {
					...otherMemberDetails,
					lastSeenMessageId: otherMembership.lastSeenMessage,
				},
				otherMembers: null,
			};
		}
	},
});
