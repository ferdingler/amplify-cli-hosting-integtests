# Amplify CLI + Hosting Integration Tests

## How to run the tests

Install dependencies

```bash
npm install
```

Replace input parameters in the `test/params.json` file with your own GitHub repository URL, branchName and a valid personal access token from GitHub. Your repository should be for an Amplify App that creates backend resources so that the CLI is excercised during the build.

```json
{
  "githubRepoUrl": "https://github.com/aws-aemilia/BackendBuild-IntegTest-Codegen-DoNotTouch",
  "githubOauthToken": "REPLACE_WITH_A_PERSONAL_ACCESS_TOKEN",
  "githubRepoBranchName": "mainline",
  "region": "us-east-1",
  "amplifyCliVersion": "beta"
}
```

Then, configure valid AWS credentials for any AWS account. It doesn't matter what account or region you use. The tests will run against Amplify Hosting in production.

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...
```

Then run the tests

```bash
npm run test
```
