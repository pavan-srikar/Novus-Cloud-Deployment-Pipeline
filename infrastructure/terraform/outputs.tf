output "public_ip" {

  value = aws_eip.novus.public_ip
}

output "public_dns" {

  value = aws_instance.novus.public_dns
}

output "instance_id" {

  value = aws_instance.novus.id
}