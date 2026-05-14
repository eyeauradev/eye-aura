declare module "resend" {
  export interface Resend {
    emails: {
      send(options: {
        from: string;
        to: string | string[];
        subject: string;
        html?: string;
        text?: string;
      }): Promise<{ id: string }>;
    };
  }

  export const Resend: new (apiKey: string) => Resend;
}
