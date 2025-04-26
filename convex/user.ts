import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Mutation to create a new user entry in the "users" table in ConvexDB
export const create = internalMutation({
	args: {
		username: v.string(),
		imageUrl: v.string(),
		clerkId: v.string(),
		email: v.string(),
	},
	handler: async (ctx, args) => {
		// Insert a new document into the "users" table using the provided arguments
		await ctx.db.insert("users", args);
	},
});

// Query to retrieve a user by their Clerk ID
export const get = internalQuery({
	args: {
		clerkId: v.string(), // Clerk ID to look up the user
	},
	async handler(ctx, args) {
		// Search for a user in the "users" table by the Clerk ID using an index
		return ctx.db
			.query("users")
			.withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
			.unique();
	},
});
