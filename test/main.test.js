const AWS = require("aws-sdk");
const params = require("./params.json");

let appId;
let roleName;

const iamClient = new AWS.IAM();
const amplify = new AWS.Amplify({
  region: params.region,
});

afterEach(() => {
  // Cleanup
  await amplify.deleteApp({ appId }).promise();
  await iamClient.deleteRole({ RoleName: roleName }).promise();
});

test("should run a successful build on Amplify Hosting using the Beta CLI", async () => {
  // Create random App Name
  const appName = new Date().toISOString();

  /**
   * 1. Create an IAM role with a trust policy that allows Amplify Hosting
   * to assume it and run the CLI with its credentials.
   */
  const { Role } = await iamClient
    .createRole({
      RoleName: appName,
      AssumeRolePolicyDocument: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "amplify.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      }),
    })
    .promise();

  roleName = Role.RoleName;

  /**
   * 2. Attach the managed policy AdministratorAccess-Amplify that allows
   * the CLI to create the necessary CloudFormation stacks in the AWS account.
   */
  console.log("Created IAM role with name " + Role.RoleName);
  await iamClient
    .attachRolePolicy({
      RoleName: Role.RoleName,
      PolicyArn: "arn:aws:iam::aws:policy/AdministratorAccess-Amplify",
    })
    .promise();

  /**
   * 3. Create an Amplify App using a GitHub repository that creates backend
   * resources so that the CLI is excercised.
   */
  const { app } = await amplify
    .createApp({
      name: appName,
      repository: params.githubRepoUrl,
      oauthToken: params.githubOauthToken,
      iamServiceRoleArn: Role.Arn,
      environmentVariables: {
        _LIVE_UPDATES: JSON.stringify([
          {
            pkg: "@aws-amplify/cli",
            type: "npm",
            version: params.amplifyCliVersion,
          },
        ]),
      },
    })
    .promise();

  appId = app.appId;

  /**
   * 4. Create a branch and link it to the default branch on the GitHub repo.
   */
  await amplify
    .createBranch({
      branchName: githubRepoBranch,
      appId: app.appId,
    })
    .promise();

  /**
   * 5. Start a build fromt he branch created above.
   */
  const { jobSummary } = await amplify
    .startJob({
      appId,
      branchName,
      jobType: JobType.RELEASE,
    })
    .promise();

  let buildIsRunning = true;
  let currentStatus;

  /**
   * 6. Wait until build finishes and verify the last status is SUCEED
   */
  while (buildIsRunning) {
    const { job } = await amplify
      .getJob({
        appId,
        branchName,
        jobId: jobSummary.jobId,
      })
      .promise();

    currentStatus = job.summary.status;
    console.log(`Build ${jobSummary.jobArn} is in status ${currentStatus}`);

    if (
      currentStatus === "CANCELLING" ||
      currentStatus === "RUNNING" ||
      currentStatus === "PENDING" ||
      currentStatus === "PROVISIONING"
    ) {
      buildIsRunning = true;
    } else {
      buildIsRunning = false;
    }

    await timeout(20000); // sleep for 20 seconds
  }

  /**
   * If this assertion fails, go to your AWS Account where the Ampliy App
   * got created and check the logs to see why the build failed.
   */
  expect(currentStatus).toEqual("SUCCEED");
});

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
