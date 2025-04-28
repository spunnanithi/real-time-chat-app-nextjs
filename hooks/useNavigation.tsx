import { MessageSquare, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

// Custom hook to generate navigation links with active state based on current pathname
export const useNavigation = () => {
	const pathname = usePathname(); // Get the current URL path

	// Memoize the navigation paths array to avoid recalculating on every render
	const paths = useMemo(
		() => [
			{
				name: "Conversations",
				href: "/conversations",
				icon: <MessageSquare />,
				active: pathname.startsWith("/conversations"),
			},
			{
				name: "Friends",
				href: "/friends",
				icon: <Users />,
				active: pathname === "/friends",
			},
		],
		[pathname]
	);

	return paths;
};
