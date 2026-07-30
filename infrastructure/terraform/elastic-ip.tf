resource "aws_eip" "novus" {

  instance = aws_instance.novus.id

  domain = "vpc"

  tags = {
    Name = "${var.project_name}-eip"
  }
}