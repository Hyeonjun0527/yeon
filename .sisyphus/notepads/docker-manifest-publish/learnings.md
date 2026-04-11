Investigation notes: publish_manifest manifest creation flow and digest reuse
Workflow file: /home/osuma/coding_stuffs/yeon/.github/workflows/docker-image.yml
Digest sources:

- amd64: /tmp/digests digest file created from ${{ steps.build.outputs.digest }} in the Build amd64 step (digest-amd64 artifact)
- arm64: /tmp/digests digest file created from ${{ steps.build.outputs.digest }} in the Build arm64 step (digest-arm64 artifact)
  Digest artifacts are uploaded as digest-amd64 and digest-arm64, then downloaded by publish_manifest
  Manifest creation uses: docker buildx imagetools create with $refs built from downloaded digests
  Refs are constructed as: IMAGE@sha256:<digest>
  Rerunning only publish_manifest reuses digests only if new build artifacts are present or if re-run within same run; absence of explicit cross-run caching means reuse is not guaranteed.
