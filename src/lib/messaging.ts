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
  return `You have been reffered to the DietByRD Platform by Dr. ${doctorName}. To complete your onboarding process please click on the link below.\n${onboardingLink}`;
};

export const sendReferralWhatsAppMessage = (params: SendReferralWhatsAppMessageParams): void => {
  const messageContent = buildReferralWhatsAppMessage({
    doctorName: params.doctorName,
    onboardingLink: params.onboardingLink,
  });

  console.log(messageContent);

  void {
    providerName: params.providerName,
    providerApiUrl: params.providerApiUrl,
    providerApiKey: params.providerApiKey,
    senderPhoneNumber: params.senderPhoneNumber,
    recipientPhoneNumber: params.recipientPhoneNumber,
    templateId: params.templateId,
    languageCode: params.languageCode,
    metadata: params.metadata,
    messageContent,
  };
};