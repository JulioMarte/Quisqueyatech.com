import { SignIn } from "@clerk/nextjs";
import { Container, Section } from "@/components/ui/section";
export default function SignInPage() { if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null; return <Section><Container className="flex justify-center"><SignIn /></Container></Section>; }
