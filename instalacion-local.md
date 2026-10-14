# Instalación local

## 1. Programas en Windows

1. Instalar [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Instalar [VS Code](https://code.visualstudio.com/).
3. En VS Code, instalar las extensiones **WSL** y **Remote Control**.
4. Instalar Proton VPN.
5. Instalar **Debian** desde Microsoft Store.

## 2. Configurar Debian

Abrir Debian. La primera vez pide crear un usuario y contraseña de Linux (no tienen que coincidir con los de Windows).

Luego crear una carpeta de trabajo y abrirla en VS Code:

```bash
mkdir ~/workspace
cd ~/workspace
code .
```

## 3. Clonar el repositorio

Desde la terminal de Debian, dentro de `~/workspace`:

```bash
git clone https://github.com/yokian1/sryg
```

## 4. Claude en VS Code

1. Instalar Claude Code desde la terminal de Debian:

   ```bash
   curl -fsSL https://claude.ai/install.sh | bash
   ```

2. Instalar la extensión de Claude en VS Code.
3. Pedirle a Claude que instale Gentle AI desde https://github.com/Gentleman-Programming/gentle-ai
