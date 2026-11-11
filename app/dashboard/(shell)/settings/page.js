import { PageHeader } from "@/components/app/AppShell";
import { ProfileForm, PasswordForm } from "@/components/app/SettingsForms";
import { Card } from "@/components/audit/ui";
import { requireUser } from "@/lib/server/dal";
import { formatDay } from "@/lib/format";

export const metadata = { title: "Settings — Sire Crawler" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" subtitle={`Member since ${formatDay(user.createdAt)}`} />
      <div className="max-w-3xl space-y-6">
        <Card className="p-6 sm:p-8">
          <h2 className="text-[15px] font-bold text-ink">Profile</h2>
          <p className="mb-6 mt-0.5 text-xs text-mute">This information is used on your quotes and invoices.</p>
          <ProfileForm user={user} />
        </Card>
        <Card className="p-6 sm:p-8">
          <h2 className="text-[15px] font-bold text-ink">Password</h2>
          <p className="mb-6 mt-0.5 text-xs text-mute">Changing your password signs you out on other devices.</p>
          <PasswordForm email={user.email} />
        </Card>
      </div>
    </>
  );
}
