# Deployment Guide

Complete guide for deploying the SQL Query Web API to various hosting environments.

## Prerequisites

- .NET 8.0 Runtime or SDK installed on the target server
- SQL Server connectivity (same network or VPN)
- HTTPS certificate (self-signed or trusted)
- Appropriate server permissions

## Table of Contents

1. [Windows IIS](#windows-iis)
2. [Linux (systemd service)](#linux-systemd-service)
3. [Docker](#docker)
4. [Azure App Service](#azure-app-service)
5. [AWS Elastic Beanstalk](#aws-elastic-beanstalk)
6. [Production Best Practices](#production-best-practices)

---

## Windows IIS

### 1. Publish the Application

```bash
cd SqlQueryAPI
dotnet publish -c Release -o ..\publish
```

### 2. Create IIS Website

**Option A: Using IIS Manager**
1. Open IIS Manager
2. Right-click "Sites" → "Add Website"
3. Configure:
   - Site name: `SqlQueryAPI`
   - Physical path: `C:\inetpub\SqlQueryAPI`
   - Binding: `https`, hostname: `yourdomain.com`, port: 443
   - SSL Certificate: Select your certificate
4. Click OK

**Option B: Using PowerShell**
```powershell
# Copy published files
Copy-Item -Path "..\publish\*" -Destination "C:\inetpub\SqlQueryAPI" -Recurse

# Create IIS Site
New-IISSite -Name "SqlQueryAPI" `
  -PhysicalPath "C:\inetpub\SqlQueryAPI" `
  -BindingInformation "*:443:yourdomain.com"

# Configure SSL binding
$cert = Get-Item Cert:\LocalMachine\My\<thumbprint>
Add-IISSiteBinding -Name "SqlQueryAPI" `
  -Protocol https `
  -BindingInformation "@:443:yourdomain.com" `
  -SslFlag Sni
```

### 3. Configure Application Pool

1. Open IIS Manager
2. Select "Application Pools"
3. Create new pool for the API:
   - Name: `SqlQueryAPI`
   - .NET CLR version: No Managed Code
   - Managed pipeline mode: Integrated
4. Configure identity:
   - Identity: ApplicationPoolIdentity or specific user
   - Assign appropriate permissions to database user

### 4. Set Environment Variables (IIS)

Create or edit `web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
    </handlers>
    <aspNetCore processPath="dotnet" arguments=".\SqlQueryAPI.dll" 
                stdoutLogEnabled="false" 
                stdoutLogFile=".\logs\stdout"
                hostingModel="inprocess">
      <environmentVariables>
        <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
        <environmentVariable name="ASPNETCORE_URLS" value="https://+:443" />
      </environmentVariables>
    </aspNetCore>
    <httpRedirect enabled="true" destination="https://{HTTP_HOST}{REQUEST_URI}" 
                  exactDestination="true" httpResponseStatus="Permanent" />
  </system.webServer>
</configuration>
```

### 5. Test the Deployment

```bash
# Check if the site is accessible
curl https://yourdomain.com/api/query/health

# View IIS logs
Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\u_ex*.log"
```

---

## Linux (systemd service)

### 1. Install .NET Runtime

```bash
# Ubuntu/Debian
wget https://dot.net/v1/dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --version 8.0

# Install as system service
sudo apt-get install dotnet-runtime-8.0 aspnetcore-runtime-8.0
```

### 2. Create Application Directory

```bash
sudo mkdir -p /var/www/sqlqueryapi
sudo chown -R $USER:$USER /var/www/sqlqueryapi
```

### 3. Publish Application

```bash
cd SqlQueryAPI
dotnet publish -c Release -o ../publish
```

### 4. Copy Files to Server

```bash
# Copy published files
scp -r ./publish/* user@server:/var/www/sqlqueryapi/

# Or using rsync
rsync -avz --delete ./publish/ user@server:/var/www/sqlqueryapi/
```

### 5. Create systemd Service

Create `/etc/systemd/system/sqlqueryapi.service`:

```ini
[Unit]
Description=SQL Query Web API
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/var/www/sqlqueryapi
ExecStart=/usr/bin/dotnet /var/www/sqlqueryapi/SqlQueryAPI.dll
Restart=always
RestartSec=10
SyslogIdentifier=sqlqueryapi
Environment="ASPNETCORE_ENVIRONMENT=Production"
Environment="ASPNETCORE_URLS=https://0.0.0.0:5001"

[Install]
WantedBy=multi-user.target
```

### 6. Start and Enable Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start the service
sudo systemctl start sqlqueryapi

# Enable on boot
sudo systemctl enable sqlqueryapi

# Check status
sudo systemctl status sqlqueryapi

# View logs
sudo journalctl -u sqlqueryapi -f
```

### 7. Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/sqlqueryapi`:

```nginx
upstream sqlqueryapi {
    server 127.0.0.1:5001;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL configuration
    ssl_certificate /etc/ssl/certs/your_cert.crt;
    ssl_certificate_key /etc/ssl/private/your_key.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Logging
    access_log /var/log/nginx/sqlqueryapi_access.log;
    error_log /var/log/nginx/sqlqueryapi_error.log;
    
    # Proxy settings
    location / {
        proxy_pass https://sqlqueryapi;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/sqlqueryapi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Docker

### 1. Create Dockerfile

```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["SqlQueryAPI.csproj", "./"]
RUN dotnet restore "SqlQueryAPI.csproj"
COPY . .
RUN dotnet build "SqlQueryAPI.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "SqlQueryAPI.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5001

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Create logs directory
RUN mkdir -p /app/logs

# Set environment
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=https://+:5001

ENTRYPOINT ["dotnet", "SqlQueryAPI.dll"]
```

### 2. Create Docker Compose File

```yaml
version: '3.8'

services:
  sqlqueryapi:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5001:5001"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ASPNETCORE_URLS=https://+:5001
      - ConnectionStrings__DefaultConnection=Server=sqlserver;Database=YourDB;User Id=sa;Password=YourPassword123!;TrustServerCertificate=true;
    volumes:
      - ./logs:/app/logs
      - ./certs:/app/certs:ro
    depends_on:
      - sqlserver
    networks:
      - api-network

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourPassword123!
      - MSSQL_PID=Developer
    ports:
      - "1433:1433"
    volumes:
      - sqlserver_data:/var/opt/mssql
    networks:
      - api-network

networks:
  api-network:
    driver: bridge

volumes:
  sqlserver_data:
```

### 3. Build and Run

```bash
# Build the image
docker build -t sqlqueryapi:latest .

# Run the container
docker run -d \
  -p 5001:5001 \
  -e "ConnectionStrings__DefaultConnection=Server=sqlserver;Database=YourDB;..." \
  --name sqlqueryapi \
  sqlqueryapi:latest

# Or use Docker Compose
docker-compose up -d
```

---

## Azure App Service

### 1. Create App Service

```bash
# Create resource group
az group create --name SqlQueryAPI-RG --location eastus

# Create App Service Plan
az appservice plan create \
  --name SqlQueryAPI-Plan \
  --resource-group SqlQueryAPI-RG \
  --sku B2

# Create Web App
az webapp create \
  --name sqlqueryapi \
  --resource-group SqlQueryAPI-RG \
  --plan SqlQueryAPI-Plan \
  --runtime 'DOTNET|8.0'
```

### 2. Configure Application Settings

```bash
az webapp config appsettings set \
  --name sqlqueryapi \
  --resource-group SqlQueryAPI-RG \
  --settings \
    ASPNETCORE_ENVIRONMENT=Production \
    ConnectionStrings__DefaultConnection="Server=tcp:yourserver.database.windows.net,1433;Initial Catalog=YourDB;User ID=sqlusername;Password=YourPassword;"
```

### 3. Deploy Application

```bash
# Using ZIP deployment
dotnet publish -c Release -o ./publish
cd publish
zip -r ../sqlqueryapi.zip .
cd ..

az webapp deployment source config-zip \
  --name sqlqueryapi \
  --resource-group SqlQueryAPI-RG \
  --src sqlqueryapi.zip
```

### 4. Configure SSL

```bash
# Import pfx certificate
az webapp config ssl bind \
  --name sqlqueryapi \
  --resource-group SqlQueryAPI-RG \
  --certificate-file-path ./certificate.pfx \
  --certificate-password 'YourPassword'
```

---

## AWS Elastic Beanstalk

### 1. Install EB CLI

```bash
pip install awsebcli
eb --version
```

### 2. Initialize and Create Application

```bash
# Initialize Elastic Beanstalk
eb init -p "\.NET 8\.0 running on 64bit Amazon Linux 2" --region us-east-1

# Create environment
eb create sqlqueryapi-env --instance-type t3.micro

# Configure environment variables
eb setenv ASPNETCORE_ENVIRONMENT=Production
```

### 3. Deploy

```bash
# Deploy the application
dotnet publish -c Release -o ./publish
eb deploy
```

### 4. Configure RDS (SQL Server)

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier sqlqueryapi-db \
  --engine sqlserver-ex \
  --db-instance-class db.t3.micro \
  --allocated-storage 20 \
  --master-username admin \
  --master-user-password 'YourPassword123!'

# Configure security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxx \
  --protocol tcp \
  --port 1433 \
  --source-security-group-id sg-yyyyyy
```

---

## Production Best Practices

### 1. Security

- ✅ Use HTTPS with trusted certificates
- ✅ Enable CORS only for trusted domains
- ✅ Implement API authentication (API keys, OAuth, etc.)
- ✅ Use secrets management (Key Vault, Secrets Manager)
- ✅ Enable firewall rules
- ✅ Regular security updates

### 2. Performance

- ✅ Enable response compression
- ✅ Configure connection pooling
- ✅ Use CDN for static content
- ✅ Implement caching
- ✅ Monitor response times
- ✅ Use appropriate timeouts

### 3. Monitoring & Logging

- ✅ Centralized logging (Application Insights, CloudWatch)
- ✅ Performance monitoring
- ✅ Error tracking and alerting
- ✅ Health check endpoints
- ✅ Request tracing

### 4. Scaling

- ✅ Load balancing
- ✅ Auto-scaling based on metrics
- ✅ Database connection pooling
- ✅ Query optimization
- ✅ Caching strategy

### 5. Backup & Recovery

- ✅ Database backups
- ✅ Application backups
- ✅ Disaster recovery plan
- ✅ Regular restore testing

### 6. Configuration Management

```csharp
// appsettings.Production.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "{from-key-vault}"
  },
  "ApiSettings": {
    "MaxQueryLength": 50000,
    "MaxPageSize": 500,
    "CommandTimeout": 60
  }
}
```

---

## Troubleshooting

### Port Already in Use
```bash
# Linux
sudo lsof -i :5001
sudo kill -9 <PID>

# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

### Connection String Issues
- Test with SSMS first
- Verify firewall rules
- Check network connectivity
- Review connection string format

### SSL Certificate Issues
- Verify certificate is valid
- Check certificate binding
- Ensure certificate matches domain

### Performance Issues
- Monitor database performance
- Check connection pool settings
- Optimize SQL queries
- Review application logs

---

## Rollback Procedure

```bash
# IIS
# Stop current site
Stop-IISSite -Name "SqlQueryAPI"

# Restore previous version
Copy-Item -Path "..\backup\previous-version\*" -Destination "C:\inetpub\SqlQueryAPI" -Recurse -Force

# Start site
Start-IISSite -Name "SqlQueryAPI"

# Docker
# Rollback to previous image
docker pull sqlqueryapi:previous
docker-compose down
docker-compose up -d
```

## Support & Documentation

- [.NET 8.0 Documentation](https://learn.microsoft.com/en-us/dotnet/)
- [Azure App Service Documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [Docker Documentation](https://docs.docker.com/)
