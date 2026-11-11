"use client";

import { useActionState } from "react";
import { updateProfile, changePassword } from "@/app/actions/auth";
import { TextInput, PasswordInput, SubmitButton, FormAlert } from "../forms";

export function ProfileForm({ user }) {
  const [state, action] = useActionState(updateProfile, undefined);
  const v = state?.values || user;
  return (
    <form action={action} className="space-y-5">
      <FormAlert tone="success">{state?.success}</FormAlert>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label="Full name" name="name" defaultValue={v.name} autoComplete="name" error={state?.errors?.name} />
        <TextInput label="Email" value={user.email} disabled hint="Contact support to change your email." readOnly />
        <TextInput label="Company" name="company" defaultValue={v.company} autoComplete="organization" optional />
        <TextInput label="Phone" name="phone" type="tel" defaultValue={v.phone} autoComplete="tel" optional />
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…" variant="dark">Save changes</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm({ email }) {
  const [state, action] = useActionState(changePassword, undefined);
  const e = state?.errors || {};
  return (
    <form action={action} className="space-y-5" key={state?.success ? "done" : "form"}>
      {/* Lets password managers associate the new password with the account */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <FormAlert tone="success">{state?.success}</FormAlert>
      <FormAlert>{state?.message}</FormAlert>
      <PasswordInput label="Current password" name="currentPassword" autoComplete="current-password" error={e.currentPassword} />
      <div className="grid gap-5 sm:grid-cols-2">
        <PasswordInput label="New password" name="newPassword" autoComplete="new-password" error={e.newPassword} hint="8+ characters with a letter and a number." />
        <PasswordInput label="Confirm new password" name="confirmPassword" autoComplete="new-password" error={e.confirmPassword} />
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Updating…" variant="dark">Update password</SubmitButton>
      </div>
    </form>
  );
}
