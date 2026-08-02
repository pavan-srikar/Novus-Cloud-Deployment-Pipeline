first you goda like create an AWS IAM account with admin or idk whatever rights that are needed to create ec2 and shit,
then you like generate a access key and enter the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in the github> repo settings> secrets and variables> actions> repo secrets.
also add all the shit you have in your .env here as the github actions will pull all these to create .env file in CD part.

you goda create a s3 bucket named novus-terraform-state-pavan-2026 and do the terrform apply, then your state file gets creted in that bucket and the whole vms, NSG, subnets all that shit gets created then you need to give that ec2 ip in github secrets like the aws secret key earlier under EC2_HOST.
then run the github actions deploy. it will do everything and you can open the http://ec2ip and website will be there.
next time you do changed you just git puch and the website updates auto.

