import React from "react";

type Props = {
	fromCurrentUser: boolean;
	senderImage: string;
	senderName: string;
	lastByUser: boolean;
	content: string[];
	createdAt: number;
	type: string;
};

const Message = ({
	fromCurrentUser,
	senderImage,
	senderName,
	lastByUser,
	content,
	createdAt,
	type,
}: Props) => {
	return <div>Message</div>;
};

export default Message;
