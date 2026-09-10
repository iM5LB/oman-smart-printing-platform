import { redirect } from 'next/navigation';

/** Legacy path — setup lives at `/onboarding`, directory at `/`. */
export default function LibraryIndexRedirect() {
  redirect('/onboarding');
}
