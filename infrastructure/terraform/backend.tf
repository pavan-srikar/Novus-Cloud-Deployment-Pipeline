terraform {
  backend "s3" {
    bucket = "novus-terraform-state-pavan-2026"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}