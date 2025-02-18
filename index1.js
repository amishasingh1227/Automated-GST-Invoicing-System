

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// Placeholder for GST API integration (replace with actual API details)
const gstApi = {
  fileGst: async (gstData) => {
    // Simulate GST API call (replace with actual API call)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() < 0.8) { // Simulate success (80% chance)
          console.log("GST filed successfully:", gstData);
          resolve({ status: "success", message: "GST filed successfully" });
        } else {
          console.error("GST filing failed:", gstData);
          reject({ status: "failed", message: "GST filing failed" });
        }
      }, 1000); // Simulate API latency
    });
  },
};

exports.generateGstInvoice = functions.firestore
  .document("bookings/{bookingId}")
  .onUpdate(async (change, context) => {
    const bookingId = context.params.bookingId;
    const newBookingData = change.after.data();
    const previousBookingData = change.before.data();

    // Check if status changed to "finished"
    if (newBookingData.status === "finished" && previousBookingData.status !== "finished") {
      try {
        const { name, totalBookingAmount, state } = newBookingData; // Add 'state' field to bookings

        // GST Calculation (example - adapt to your specific GST slabs)
        const gstRate = 0.18; // 18% GST (example)
        const gstAmount = totalBookingAmount * gstRate;

        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;

        // Determine IGST or SGST/CGST based on state (inter-state vs. intra-state)
        const businessState = "MH"; // Replace with your business state
        if (state === businessState) { // Intra-state
          cgstAmount = gstAmount / 2;
          sgstAmount = gstAmount / 2;
        } else { // Inter-state
          igstAmount = gstAmount;
        }

        const gstData = {
          bookingId,
          name,
          totalBookingAmount,
          gstAmount,
          cgstAmount,
          sgstAmount,
          igstAmount,
          // ... other required GST data for your API
        };

        // GST API Integration
        const gstResponse = await gstApi.fileGst(gstData);
        console.log("GST API Response:", gstResponse);

        // Update booking document with GST details and status
        await db.collection("bookings").doc(bookingId).update({
          gstDetails: gstData,
          gstFilingStatus: gstResponse.status,
          gstFilingMessage: gstResponse.message,
        });

      } catch (error) {
        console.error("Error generating GST invoice:", error);
        await db.collection("bookings").doc(bookingId).update({
          gstFilingStatus: "failed",
          gstFilingMessage: error.message,
        });
      }
    }
  });