import "server-only";
import Razorpay from "razorpay";
import { hasRazorpay } from "./env";

let instance: Razorpay | null = null;

export function razorpay(): Razorpay {
  if (!hasRazorpay) {
    throw new Error("Razorpay keys are not set. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  instance ??= new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
  return instance;
}
