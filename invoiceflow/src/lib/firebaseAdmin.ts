import admin from 'firebase-admin';

// Initialize Firebase Admin SDK with service account credentials
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: "invoiceapplication-c87ef",
      private_key_id: "334535107106189bb743445786bc53f1dc8df6b6",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDgWVC/9+V2fG6m\nbOV8XpXJkpCaKcqw0mZl9GhI36kik5yr/nUkCaqhRbAcv6tq9aC6MU92FlvTx0H2\n7lNjp7zdiNx8fxbqdGe/rajkSDzkOfPqBx/QQaCZGXIrXa+lG1ByBUYCh5Y0es/a\nmCZKjUktieRPwwd3+Tb9XvrV/RXWWN6ubBwzgy1G9u50Cxp6C+1P3TKPIuVVzQPh\nz2NKUScd+m8lwJu8p34Tux2LQPD8WgnmMArpO490TRlzaxmOOuSA4rv4Q27NfW0N\nSgX0SL7jZzJRvcfRgb7WvKqiZO58jWRS/qf3V7yTvSgKkRjrBFRacTzXN1kxrJ1Z\n9mHF//ufAgMBAAECggEAJEm+Gnb1+i7RVQELM403DDY1RoJZAzXdE0OvtI3c1Tds\nIZPUjcI0g8Z6YIQOLYxSdZtxP2gJbV1vCYpuGZHxpiGzjD2gTscKWwIzbc1TcBUB\no4qIdk6PNAReJ66NMRcUcYTx2Inm3VE6GqD+nJNy0TdbIx2oMRsx7lS1HPTFWfiT\nVO2lW2zB9cgGmIQ6e/yufjhGYamKSKuFS720IsQnOZ/BomCgz5chWtmQWmubOtU3\n2lArZ6qhFTbAjdUDbkxxb84j66yCikvnvuebtjnlRbGUqNOBc/XcxXrTGQdm7Vkf\nbgQ+vaJI5oYlWkRfw16jb3dJiozoXjE55QRiJ7+7cQKBgQD8xCoaS7EVHZ4vz6ia\nVDaxMGKoPCoMBguymqQ2diewIofumX+1DfLsU5RIVe+kk3tmKdUkV33dDUCgI6Rr\nT85NivIUT0tuh8WQCX4fG0rtvNoRAiolnrMORt6Lddvqmc9xdPSAiUjl3+1NIb5o\nyJtqnFXB/vPubT19/SbATS+VrwKBgQDjOBTEmXzu0Owody46cj0p/SSsWkqVzsmv\nrFs5YBQ2kWfrFNzU84JynzmzdZTIDuBvLEbc9i3g95bbnIKuNlAZbIzKPz4aT3z2\nAJy7/290NTnRHJF9Vaj2TGDzkzVG2/FPAe8i4W7bg0gi3awh02f2vqhMFSVv4nli\nUvaauAdlEQKBgQDr8lE66p0KkPMwvi8soJ/NFtWBJWg6gQo6VpAjJng1uoYY+8By\nSesRH5OzUkS449K0syf7HJCo384Lrjm00nJJgAIpYzuOmb6ZjcLlVpzC/x6v8c1W\nAKY0FYN3uzTl8V3rErmJop0ht73T2kPbnCc3hWeoB028qsxT5xNdPq/EkQKBgGaS\nfYWWyHhCpilKS/skcQoQdcq8Y+km1ZNRWkkXX2iW0XOlEl+rodq+mFy0GrsJRDXL\nph2/oExrWJXBHJkqeZRQlWoDjLRx57Zh5l9T22t5T6VfoSoUTlcJecbbUHSxe0iw\nVdTIMbQ0mo7qxPbsKYWQ4gaekSzl7uf9DcgghW4RAoGBAMQD5Ltzr9d4DoHQHKbF\ndaxQy9wOiK26GsUGFemCyxVfMyMAHyUpnfFFD6RgZfDgQZEZJH+Ly+CmtRNEX7ea\nCQbDSpEETomiz1bzMH/QukvlY/LZDAjziYTnu2u3HVf5GS6QRXfSyZ2DhkCANn5t\n21FgYmD+dSNAeYhhMEpTYZ2k\n-----END PRIVATE KEY-----\n",
      client_email: "firebase-adminsdk-fbsvc@invoiceapplication-c87ef.iam.gserviceaccount.com",
      client_id: "109017466455663561595",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40invoiceapplication-c87ef.iam.gserviceaccount.com",
      universe_domain: "googleapis.com"
    }),
    databaseURL: "https://invoiceapplication-c87ef-default-rtdb.firebaseio.com"
  });
}

export const auth = admin.auth();
export const db = admin.firestore();

export default admin; 