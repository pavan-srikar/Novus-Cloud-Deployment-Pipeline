variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 Instance"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "EC2 Key Pair"
  type        = string
}

variable "project_name" {
  description = "Project Name"
  type        = string
  default     = "novus"
}