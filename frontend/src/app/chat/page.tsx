import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function ChatPage() {
  return (
    <EmptyPagePlaceholder
      title="Chat"
      category="Header"
      description="Real-time internal chat, audit team discussions, and direct client query channels."
      iconName="MessageSquare"
      actionText="Start New Conversation"
    />
  );
}
