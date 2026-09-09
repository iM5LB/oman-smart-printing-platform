import { redirect } from 'next/navigation';

/** Web library admin removed — setup is on `/`, daily ops are in the desktop app. */
export default function LibraryIndexRedirect() {
  redirect('/');
}
