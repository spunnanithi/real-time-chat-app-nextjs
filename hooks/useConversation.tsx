import { useParams } from "next/navigation";
import { useMemo } from "react";

// Custom hook to manage conversation-related state
export const useConversation = () => {
	const params = useParams(); // Get current route parameters

	// Memoize the conversationId extracted from params
	const conversationId = useMemo(
		() => params?.conversationId || ("" as string),
		[params?.conversationId]
	);

	// Determine if a conversation is active based on the presence of conversationId
	const isActive = useMemo(() => !!conversationId, [conversationId]);

	return {
		isActive,
		conversationId,
	};
};
