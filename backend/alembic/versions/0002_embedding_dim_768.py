"""shrink memory_items.embedding to 768 dims (nomic-embed-text via Ollama)

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-16

"""
from typing import Sequence, Union

import pgvector.sqlalchemy
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_DIM = 1536
NEW_DIM = 768


def upgrade() -> None:
    # Switching embedding providers changes vector dimensionality, which
    # pgvector bakes into the column type. Existing embeddings can't be
    # reinterpreted at a different size, so this clears them out —
    # `scripts/reindex_memory.py` re-embeds everything under the new model
    # right after this migration runs.
    op.execute("DROP INDEX IF EXISTS ix_memory_items_embedding")
    op.execute("TRUNCATE TABLE memory_items")
    op.alter_column(
        "memory_items",
        "embedding",
        type_=pgvector.sqlalchemy.Vector(NEW_DIM),
        postgresql_using=f"embedding::vector({NEW_DIM})",
    )
    op.execute(
        "CREATE INDEX ix_memory_items_embedding ON memory_items "
        "USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_memory_items_embedding")
    op.execute("TRUNCATE TABLE memory_items")
    op.alter_column(
        "memory_items",
        "embedding",
        type_=pgvector.sqlalchemy.Vector(OLD_DIM),
        postgresql_using=f"embedding::vector({OLD_DIM})",
    )
    op.execute(
        "CREATE INDEX ix_memory_items_embedding ON memory_items "
        "USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )
