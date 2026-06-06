export interface SendReferralWhatsAppMessageParams {
  providerName: string;
  providerApiUrl: string;
  providerApiKey: string;
  senderPhoneNumber: string;
  recipientPhoneNumber: string;
  patientName: string;
  doctorName: string;
  onboardingLink: string;
  templateId?: string;
  languageCode?: string;
  metadata?: Record<string, string>;
}

export const buildReferralWhatsAppMessage = ({ doctorName, onboardingLink }: Pick<SendReferralWhatsAppMessageParams, "doctorName" | "onboardingLink">): string => {
  return `You have been referred to the DietByRD Platform by Dr. ${doctorName}. To complete your onboarding process please click on the link below.\n${onboardingLink}`;
};

export const sendReferralWhatsAppMessage = (params: SendReferralWhatsAppMessageParams): void => {
  const messageContent = buildReferralWhatsAppMessage({
    doctorName: params.doctorName,
    onboardingLink: params.onboardingLink,
  });

  console.log(messageContent);

  void fetch(params.providerApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${params.providerApiKey}`,
    },
    body: JSON.stringify({
      from: params.senderPhoneNumber,
      to: params.recipientPhoneNumber,
      templateId: params.templateId,
      languageCode: params.languageCode ?? "en",
      message: messageContent,
      metadata: params.metadata,
    }),
  }).catch((err) => {
    console.error("[sendReferralWhatsAppMessage] Failed to send message:", err);
  });
};