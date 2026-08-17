import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ContactList } from "@/components/messages/contact-list";
import { ContactThread } from "@/components/messages/contact-thread";
import { getMessageContacts, getContactThread } from "@/server/actions/messages-inbox";

export default async function OpsMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string }>;
}) {
  const { contact } = await searchParams;
  const contacts = await getMessageContacts();
  const thread = contact ? await getContactThread(contact) : null;

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Central de Mensagens</h2>
        <p className="text-sm text-muted-foreground">Todas as conversas de WhatsApp, por contato — independente da solicitação.</p>
      </div>

      <div className="flex h-[calc(100vh-13rem)] overflow-hidden rounded-xl border border-border bg-card">
        <div className="w-72 shrink-0 overflow-y-auto border-r border-border">
          {contacts.length === 0 ? (
            <EmptyState icon={MessageSquare} title="Nenhuma conversa ainda" className="border-none" />
          ) : (
            <ContactList contacts={contacts} selectedKey={contact} />
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          {thread ? (
            <ContactThread key={contact} canonicalKey={contact!} initialThread={thread} />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="Selecione um contato"
              description="Escolha uma conversa à esquerda para ver o histórico."
              className="h-full justify-center border-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}
