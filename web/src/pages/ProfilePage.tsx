import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';
import { Check, CircleUserRound, ImagePlus, Phone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { getApiErrorMessage } from '../api/client';
import { PageHeader } from '../components/Feedback';

const profileSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required.'),
  last_name: z.string().trim().min(1, 'Last name is required.'),
  email: z.union([z.literal(''), z.string().email('Enter a valid email address.')]),
  preferred_language: z.string().trim().min(2, 'Enter a language code.').max(10),
});

export function ProfilePage() {
  const { user, updateProfile, updateProfilePicture } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState('');
  const [pictureBusy, setPictureBusy] = useState(false);

  useEffect(() => {
    if (!pictureFile) {
      setPicturePreview('');
      return;
    }
    const preview = URL.createObjectURL(pictureFile);
    setPicturePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [pictureFile]);

  if (!user) return null;

  function selectPicture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose an image smaller than 5 MB.');
      return;
    }
    setError('');
    setMessage('');
    setPictureFile(file);
  }

  async function savePicture() {
    if (!pictureFile || pictureBusy) return;
    setError('');
    setMessage('');
    setPictureBusy(true);
    try {
      await updateProfilePicture(pictureFile);
      setPictureFile(null);
      setMessage('Your profile picture was updated.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setPictureBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your profile details.');
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        ...parsed.data,
        email: parsed.data.email || null,
      });
      setMessage('Your profile was updated.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  const initials = `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase() || 'A';
  return (
    <>
      <PageHeader eyebrow="YOUR AGRISMART ACCOUNT" title="My profile" description="Manage the profile details associated with your shared AgriSmart account." />
      <div className="profile-layout">
        <section className="profile-summary-card">
          {picturePreview || user.profile_picture ? (
            <img
              alt="Profile"
              className="profile-avatar-image"
              src={picturePreview || user.profile_picture || ''}
            />
          ) : <span className="profile-avatar">{initials}</span>}
          <div className="profile-picture-actions">
            <label className="button button-secondary profile-picture-choice" htmlFor="profile-picture">
              <ImagePlus size={15} aria-hidden="true" />
              Choose photo
            </label>
            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              id="profile-picture"
              onChange={selectPicture}
              type="file"
            />
            <button
              className="button button-primary"
              disabled={!pictureFile || pictureBusy}
              onClick={() => void savePicture()}
              type="button"
            >
              {pictureBusy ? 'Uploading…' : 'Save photo'}
            </button>
          </div>
          <p className="profile-picture-help">JPEG, PNG, or WebP · max 5 MB</p>
          <h2>{user.full_name || `${user.first_name} ${user.last_name}`}</h2>
          <span className="role-badge">{user.role.replaceAll('_', ' ')}</span>
          <div className="profile-facts">
            <div><Phone size={16} aria-hidden="true" /><span><small>Phone number</small><strong>{user.phone_number}</strong></span></div>
            <div><ShieldCheck size={16} aria-hidden="true" /><span><small>Phone verification</small><strong>{user.is_phone_verified ? 'Verified' : 'Not verified'}</strong></span></div>
          </div>
          <p className="secure-note">Your mobile and browser account details are managed by the same AgriSmart backend.</p>
        </section>
        <section className="form-card profile-edit-card">
          <div className="profile-form-heading"><span className="feature-icon"><CircleUserRound size={19} aria-hidden="true" /></span><div><p className="eyebrow">PERSONAL INFORMATION</p><h2>Edit profile</h2></div></div>
          <form className="form-stack" onSubmit={(event) => void submit(event)} noValidate>
            <div className="form-row">
              <label className="field"><span>First name</span><input autoComplete="given-name" defaultValue={user.first_name} name="first_name" required /></label>
              <label className="field"><span>Last name</span><input autoComplete="family-name" defaultValue={user.last_name} name="last_name" required /></label>
            </div>
            <label className="field"><span>Email address</span><input autoComplete="email" defaultValue={user.email ?? ''} name="email" type="email" /></label>
            <label className="field"><span>Preferred language code</span><input defaultValue={user.preferred_language} maxLength={10} name="preferred_language" placeholder="en" /></label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {message ? <p className="form-success" role="status"><Check size={16} aria-hidden="true" /> {message}</p> : null}
            <button className="button button-primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save profile'}</button>
          </form>
          <p className="secure-note">Your phone number cannot be changed here. Ask an AgriSmart administrator if it needs correction.</p>
        </section>
      </div>
    </>
  );
}
