export interface PostComment {
  authorId: string;
  authorTag: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: any;
}

export interface Post {
  id: string;
  authorName: string;
  authorTag: string;
  authorId: string;
  authorAvatar: string;
  text: string;
  createdAt: any; 
  reactions: string[];
  comments: PostComment[];
}

export interface User {
  uid: string;
  name: string;
  tag: string;
  avatar: string;
  createdAt?: Date;
}

export interface ChatOverview {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string; // pode ser undefined
  lastMessage?: string;     // pode ser undefined
  unread?: boolean;         // opcional
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  createdAt: any; // serverTimestamp
}

