import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */

	// Will automatically get redirected to '/conversations' route when at root URL
	async redirects() {
		return [
			{
				source: "/",
				destination: "/conversations",
				permanent: true,
			},
		];
	},
};

export default nextConfig;
