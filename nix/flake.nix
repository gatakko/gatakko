{
  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  outputs =
    {
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system: with nixpkgs.legacyPackages.${system}; {
        devShell = mkShellNoCC (rec {
          packages = [
            nodejs
            pnpm
            python3
            kubectl
            kubernetes-helm
            kustomize
          ];
          shellHook = ''
            export WORK_ZSHFUNC=${
              buildEnv {
                name = "zshcomp";
                paths = packages;
                pathsToLink = ["/share/zsh"];
              }
            }/share/zsh/site-functions
          '';
        });
      }
    );
}
