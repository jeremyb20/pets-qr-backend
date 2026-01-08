
## Para actualizar necesitas varias cosas

npx web-push generate-vapid-keys --json

En caso de ubuntu

curl -L https://fly.io/install.sh | sh

export FLYCTL_INSTALL="/home/jeremy/.fly"
export FLYCTL_INSTALL="/home/moonhicr/.fly"

export PATH="$FLYCTL_INSTALL/bin:$PATH"

//para iniciar sesion

fly auth login

// para subir un nuevo proyecto
fly launch --now

// para subir un update de petsqrbackend
fly deploy
