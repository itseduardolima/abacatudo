'use client'

import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { FormSkeleton } from '@/components/ui/Skeleton'
import { useInviteSettingsPage } from './use-invite-settings-page'

export default function InvitePage() {
  const { isLoading, isAdmin, invite, isCreating, ruleError, copied, onCreate, onCopy } = useInviteSettingsPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 pt-8 md:pb-10">
      <div className="flex items-center gap-3">
        <IconButton href="/">
          <BackIcon />
        </IconButton>
        <div>
          <h1 className="display-number text-[2rem] text-ink">Convidar</h1>
          <p className="text-sm text-muted">Gere um link para uma pessoa criar a conta dela.</p>
        </div>
      </div>

      {isLoading && <FormSkeleton fields={1} />}

      {!isLoading && !isAdmin && <InlineAlert>Só o administrador pode convidar.</InlineAlert>}

      {!isLoading && isAdmin && (
        <>
          <p className="text-sm text-text">
            O link vale por 72 horas e só pode ser usado uma vez. Gerar um novo invalida o anterior. Quem aceitar
            conecta as próprias contas pelo Meu Pluggy e não vê os seus dados.
          </p>
          {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
          <Button onClick={() => void onCreate()} state={isCreating ? 'loading' : 'idle'} className="w-full">
            {invite ? 'Gerar outro link' : 'Gerar link de convite'}
          </Button>
          {invite && (
            <div className="flex flex-col gap-3 rounded-card-lg bg-tint px-5 py-5">
              <p className="break-all text-sm text-ink" data-cy="invite-link">
                {invite.link}
              </p>
              <Button variant="outline" onClick={() => void onCopy()} className="w-full">
                {copied ? 'Link copiado' : 'Copiar link'}
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
