# Billi Bazaar

Static thrift marketplace demo. No build step or server-side setup is required.

## Publish with GitHub Pages

1. Create a GitHub repository and upload the contents of this folder to its root.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
4. Wait for the Pages deployment to finish. GitHub will show the shareable URL in **Settings → Pages**.

The site uses relative asset paths so it works on both a project Pages URL and a custom domain. Checkout is integrated into the main page.


## Customer account prototype

Mobile-number profiles, customer IDs, and Thread points are stored in the visitor's browser for this static prototype. It does not send SMS OTPs or sync account data across devices. A production loyalty account needs an authentication provider and a database/API before launch.
