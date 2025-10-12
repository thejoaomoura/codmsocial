export interface Post {
  id: string;
  authorName: string;
  authorId: string;
  authorAvatar: string;
  text: string;
  createdAt: any;
  reactions: string[];
}

export interface ChatOverview {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string;
  lastMessage: string;
  unread: boolean;
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: any;
}