// libs/firebaseAuth.ts
import { getAuth, RecaptchaVerifier } from "firebase/auth";
import app from "./firebase";

const auth = getAuth(app);

export { auth, RecaptchaVerifier };
