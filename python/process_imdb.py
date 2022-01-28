"""
Preprocess the IMDB dataset files.  The dataset can be downloaded from https://deepai.org/dataset/imdb. 
"""

import pandas as pd
import click

# Constants
MIN_YEAR = 1980
MIN_AVG_RATING = 6.0
MIN_RATING_COUNT = 100000

# Preprocessing methods


def load_title_basics(path: str) -> pd.DataFrame:
    """Load and preprocess the 'title.basics.tsv' file"""

    # Load
    click.echo("Loading title basics...")
    basics_df: pd.DataFrame = pd.read_csv(
        f"{path}/title.basics.tsv",
        sep="\t",
        usecols=[
            "tconst",
            "titleType",
            "primaryTitle",
            "startYear",
            "runtimeMinutes",
            "genres",
        ],
        low_memory=False,
    )
    basics_df.rename(columns={"tconst": "titleId"}, inplace=True)

    # Filter
    click.echo("Processing title basics...")
    basics_df = basics_df.loc[basics_df["startYear"] != "\\N"]
    basics_df = basics_df.loc[basics_df["startYear"].astype("int") >= MIN_YEAR]
    basics_df = basics_df.loc[basics_df["titleType"] == "movie"]

    return basics_df


def load_title_akas(path: str) -> pd.DataFrame:
    """Load and preprocess the 'title.akas.tsv' file"""

    # Load
    click.echo("Loading title akas...")
    akas_df = pd.read_csv(
        f"{path}/title.akas.tsv",
        sep="\t",
        usecols=[
            "titleId",
            "region",
        ],
    )

    # Filter
    click.echo("Processing title akas...")
    akas_df = akas_df.loc[akas_df["region"].isin(["US", "GB"])]

    return akas_df


def load_ratings(path: str) -> pd.DataFrame:
    """Load and preprocess the 'title.ratings.tsv' file"""

    # Load
    click.echo("Loading title ratings...")
    ratings_df: pd.DataFrame = pd.read_csv(f"{path}/title.ratings.tsv", sep="\t")
    ratings_df.rename(columns={"tconst": "titleId"}, inplace=True)

    # Filter
    click.echo("Processing title ratings...")
    ratings_df = ratings_df.loc[ratings_df["averageRating"] >= MIN_AVG_RATING]
    ratings_df = ratings_df.loc[ratings_df["numVotes"] >= MIN_RATING_COUNT]

    return ratings_df


def process(path: str) -> pd.DataFrame:
    """Load and process all relevant TSV files"""

    # Load
    df = load_title_basics(path)
    akas_df = load_title_akas(path)
    ratings_df = load_ratings(path)

    # Join
    click.echo("Joining....")
    df = df.set_index("titleId")
    df = df.join(akas_df.set_index("titleId"), on=["titleId"], how="inner")
    df = df.join(ratings_df.set_index("titleId"), on="titleId", how="inner")

    # Drop duplicates
    df = df.reset_index()
    df = df.groupby(["titleId"]).first().reset_index()

    return df


@click.command()
@click.option("--output", default="./", help="path in which to create output")
@click.argument("path")
def main(output: str, path: str):
    """Preprocess IMDB dataset and write output to a `movies.csv` file."""

    # Preprocess
    df = process(path)

    # Only keep necessary fields
    df = df[
        [
            "titleId",
            "primaryTitle",
            "startYear",
            "runtimeMinutes",
            "genres",
            "averageRating",
        ]
    ]
    df["genres"] = df["genres"].apply(lambda x: x.replace(",", " "))

    # Write to output
    output_file = f"{output}/movies.csv"
    df.to_csv(output_file, index=False)

    click.echo(f"Wrote output to '{output_file}")


# Entrypoint
if __name__ == "__main__":
    main()
