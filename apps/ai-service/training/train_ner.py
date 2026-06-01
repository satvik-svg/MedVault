"""Training entrypoint placeholder.

Provide i2b2-derived token classification JSON through NER_TRAIN_PATH and write the
fine-tuned checkpoint to NER_OUTPUT_PATH. The production service loads that path via
NER_MODEL_PATH.
"""


def main() -> None:
    raise SystemExit("NER training requires licensed i2b2 data. Set up data locally before running.")


if __name__ == "__main__":
    main()
