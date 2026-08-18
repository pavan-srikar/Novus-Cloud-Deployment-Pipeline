variable "aws_region" {
  description = "AWS Region"
  type        = string
}

variable "instance_type" {
  description = "EC2 Instance"
  type        = string
}

variable "key_name" {
  description = "EC2 Key Pair"
  type        = string
}

variable "project_name" {
  description = "Project Name"
  type        = string
}

variable "git_repo_url" {
  description = "Git URL of this repo — used to clone the app onto the EC2 box and to point ArgoCD's Application at the correct source"
  type        = string
}