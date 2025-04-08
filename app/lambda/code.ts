


import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { Queues } from "../sqs";
import { pdfBucket } from "../s3";
import { ManagedPolicies } from "@pulumi/aws/iam";

const config = new pulumi.Config();
const senderEmail = config.require('sender-email');

const pdfLayer = new aws.lambda.LayerVersion("pdfLayer", {
  layerName: "pdfLayer",
  code: new pulumi.asset.AssetArchive({
    "": new pulumi.asset.FileArchive("./lambda/layer/chrome_aws_lambda.zip"),
  }),
  compatibleRuntimes: [aws.lambda.Runtime.NodeJS14dX],
});

const sqs = new aws.sdk.SQS({ region: "us-east-1" });

const generatePdf = async (content: string): Promise<Buffer> => {
  const chromium = require('chrome-aws-lambda');
  let browser: any = undefined;
  try {
    
    
    // Launch a headless chrome instance
    
    
    const executablePath = await chromium.executablePath;
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });

    
    
    // Create a new page
    
    
    const page = await browser.newPage();
    const html = `<h1> Hi! Here is a copy of your PDF Content that you requested!</h1> <br/> <hr/> <p> ${content} </p>`;
    
    
    // Sets page's content
    
    
    await page.setContent(html);

   
    // Generates the PDF as a buffer and returns it

    
    return (await page.pdf({ format: "A4" })) as Buffer;
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    if (browser !== undefined) {
      
      // Close browser
      
      await browser.close();
    }
  }
};

export const pdfProcessingLambda = new aws.lambda.CallbackFunction("pdfProcessingLambda", {
  callback: async (event: aws.sqs.QueueEvent) => {
    const processedEventPromises = event.Records.map(async (record) => {
      const { messageId, body, receiptHandle } = record;
      const { content, email } = JSON.parse(body) as {
        email: string;
        content: string;
      };

      // Generate PDF
      
      const pdf = await generatePdf(content);

      const pdfName = `${messageId}.pdf`;

      // Upload PDF to S3
      
      const s3 = new aws.sdk.S3({ region: "eu-central-1" });
      await s3.putObject({
        Bucket: pdfBucket.bucket.get(),
        Key: `pdf/${pdfName}`,
        Body: pdf,
        ContentType: "application/pdf",
      }).promise();

      // Generate signed URL from S3 for Public Reads
      
      const signedUrl = await s3.getSignedUrlPromise("getObject", {
        Bucket: pdfBucket.bucket.get(),
        Key: `pdf/${pdfName}`,
        Expires: 60 * 60 * 24 * 7,  // 7 days
      });

      // Send email with signed URL
      
      const ses = new aws.sdk.SES({ region: "us-east-1" });
      await ses.sendEmail({
        Source: senderEmail,
        Destination: { ToAddresses: [email], },
        Message: {
          Body: { Html: { Charset: "UTF-8", Data: `Your pdf is ready. <a href="${signedUrl}">Download</a>`, }, },
          Subject: { Data: "Your pdf is ready", Charset: "UTF-8" },
        },
      }).promise();

      // Deletes message from queue
      
      await sqs.deleteMessage({ QueueUrl: Queues.pdfProcessingQueue.url.get(), ReceiptHandle: receiptHandle }).promise();
      console.log(`Deleted message ${messageId} from queue`);
    });
    await Promise.all(processedEventPromises);
  },
  memorySize: 3072,
  runtime: aws.lambda.Runtime.NodeJS14dX,
  timeout: 30,
  layers: [pdfLayer.arn],
  policies: [ManagedPolicies.AmazonSESFullAccess, ManagedPolicies.AmazonS3FullAccess, ManagedPolicies.AmazonSQSFullAccess, ManagedPolicies.AWSLambdaBasicExecutionRole, ManagedPolicies.CloudWatchFullAccess],
});
