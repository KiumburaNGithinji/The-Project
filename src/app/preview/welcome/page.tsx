import WelcomeFlow from "@/components/welcome/WelcomeFlow";

/** The first-run flow exactly as a new student meets it. Nothing is saved. */
export default function PreviewWelcomePage() {
  return <WelcomeFlow name="Preview User" demo />;
}
