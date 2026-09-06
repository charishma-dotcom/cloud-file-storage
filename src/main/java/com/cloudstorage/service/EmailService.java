package com.cloudstorage.service;

import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendFileShareEmail(
            String recipient,
            String fileName,
            String permission,
            String sharedBy) {

        System.out.println("========================================");
        System.out.println("EMAIL SENDING STARTED");
        System.out.println("Recipient   : " + recipient);
        System.out.println("File        : " + fileName);
        System.out.println("Permission  : " + permission);
        System.out.println("Shared By   : " + sharedBy);
        System.out.println("========================================");

        try {

            SimpleMailMessage message =
                    new SimpleMailMessage();

            message.setTo(recipient);

            message.setSubject(
                    "A file has been shared with you"
            );

            message.setText(
                    "Hello,\n\n" +

                    sharedBy +
                    " has shared a file with you.\n\n" +

                    "File: " +
                    fileName +
                    "\n" +

                    "Permission: " +
                    permission +
                    "\n\n" +

                    "Please login to Cloud File Storage " +
                    "and open the 'Shared with Me' section " +
                    "to access the file.\n\n" +

                    "Cloud File Storage"
            );

            mailSender.send(message);

            System.out.println("========================================");
            System.out.println("EMAIL SENT SUCCESSFULLY TO SMTP SERVER");
            System.out.println("Recipient: " + recipient);
            System.out.println("========================================");

        } catch (MailException e) {

            System.err.println("========================================");
            System.err.println("EMAIL SENDING FAILED");
            System.err.println("Recipient: " + recipient);
            System.err.println("Error: " + e.getMessage());
            System.err.println("========================================");

            e.printStackTrace();

            throw e;
        }
    }
}