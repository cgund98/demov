"""
Load processed movies.csv and send each row as a message to the SQS queue.
"""
import json

import pandas as pd
import boto3
import click

# Create SQS client
sqs = boto3.client("sqs")


def load_movies(path: str) -> pd.DataFrame:
    """Load the dataframe from file system"""

    df = pd.read_csv(f"{path}/movies.csv")
    return df


def send_movie(movie: dict, queue_url: str) -> None:
    """Send a movie on the SQS queue"""
    # Format message
    data = dict(
        imdbId=movie["titleId"], title=movie["primaryTitle"], year=movie["startYear"]
    )

    # Send message
    sqs.send_message(
        QueueUrl=queue_url,
        DelaySeconds=5,
        MessageBody=json.dumps(data),
    )


@click.command()
@click.option("--queue", help="URL of the SQS queue")
@click.argument("path")
def main(queue: str, path: str):
    """Preprocess IMDB dataset and write output to a `movies.csv` file."""

    # Preprocess
    click.echo("Loading movies...")
    df = load_movies(path)

    # Send
    click.echo("Sending messages")
    for i, movie in df.iterrows():
        send_movie(movie, queue)

        if i % 100 == 0:
            click.echo(f"Sent {i}/{len(df)} messages.")


# Entrypoint
if __name__ == "__main__":
    main()
