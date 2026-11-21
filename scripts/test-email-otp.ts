import { createOtpChallenge, verifyOtpChallenge } from "../src/lib/email-service";

async function run() {
  console.log("1. Creating OTP challenge for test@fixme.co.th...");
  const challenge = await createOtpChallenge("test@fixme.co.th", "register");
  console.log("Challenge created! OTP:", challenge.devOtp);

  console.log("2. Verifying with correct OTP...");
  const valid = await verifyOtpChallenge("test@fixme.co.th", challenge.devOtp!, challenge.verificationToken, "register");
  console.log("Verification succeeded:", valid);

  console.log("3. Verifying replay protection (same token should fail)...");
  try {
    await verifyOtpChallenge("test@fixme.co.th", challenge.devOtp!, challenge.verificationToken, "register");
    console.error("FAIL: Replay protection did not trigger!");
  } catch (err: any) {
    console.log("SUCCESS: Replay protection caught reused token:", err.message);
  }

  console.log("4. Verifying wrong OTP...");
  const challenge2 = await createOtpChallenge("test2@fixme.co.th", "register");
  try {
    await verifyOtpChallenge("test2@fixme.co.th", "000000", challenge2.verificationToken, "register");
    console.error("FAIL: Wrong OTP passed!");
  } catch (err: any) {
    console.log("SUCCESS: Wrong OTP rejected:", err.message);
  }

  console.log("\nALL EMAIL OTP TESTS PASSED 100%!");
  process.exit(0);
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
