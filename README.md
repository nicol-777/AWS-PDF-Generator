# AWS PDF Generator (WIP)

PDFs are a core part any web applications, used for sending invoices, reports, or signed documents — As s developer, it is inevitable that eventually everyone will have to implement a PDF generation feature that is both scalable and secure.

A common starting point is client-side PDF generation using tools like `react-pdf/renderer` in React. While this approach is quick and easy, it has a few limitations. PDFs generated on the client is often not secure, lacks traceability, and can't be securely signed without exposing private keys. Additionally, performance may suffer on low-end devices or outdated browsers.

To overcome these challenges, server-side PDF generation is a more suitable approach. It allows for increased security, authenticated documents, larger levels of control, and consistency — regardless of the user's device or browser.

Leveraging serverless architecture enhances this even further by offering scalability, resilience, and cost-efficiency. The architecture uses AWS services to build a robust PDF generation pipeline. API Gateway receives client requests, triggering a Lambda function that pushes data to an SQS queue. This queue decouples the generation process and ensures scalability. Another Lambda function processes the queue to generate PDFs and store them in an S3 bucket. SES is then used to email a signed URL of the PDF to the client. For fault tolerance, a Dead Letter Queue captures failed messages after multiple retries.

This design allows for a secure, traceable, and efficient PDF generation service that can grow with the application’s needs.
