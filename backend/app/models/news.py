from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey
from datetime import datetime
from app.database import Base

class NewsArticle(Base):
    __tablename__ = "news_articles"
    id          = Column(Integer, primary_key=True, index=True)
    headline    = Column(String(500), nullable=False)
    summary     = Column(Text, nullable=True)
    url         = Column(String(1000), unique=True, nullable=False)
    source_name = Column(String(100), nullable=False)
    category    = Column(String(60), default="general_economy")
    published_at = Column(DateTime, nullable=True)
    fetched_at  = Column(DateTime, default=datetime.utcnow)
    is_active   = Column(Boolean, default=True)

class LiveRate(Base):
    __tablename__ = "live_rates"
    id           = Column(Integer, primary_key=True, index=True)
    rate_type    = Column(String(50), nullable=False)  # usd_zmw | petrol | diesel | copper
    value        = Column(Float, nullable=False)
    unit         = Column(String(30), default="")
    direction    = Column(String(10), default="stable")  # up | down | stable
    previous     = Column(Float, nullable=True)
    fetched_at   = Column(DateTime, default=datetime.utcnow)

class KipAlert(Base):
    __tablename__ = "kip_alerts"
    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    article_id     = Column(Integer, ForeignKey("news_articles.id"), nullable=True)
    rate_type      = Column(String(50), nullable=True)
    headline       = Column(String(500), nullable=False)
    kip_message    = Column(Text, nullable=False)
    business_name  = Column(String(255), nullable=True)
    category       = Column(String(60), nullable=True)
    is_read        = Column(Boolean, default=False)
    created_at     = Column(DateTime, default=datetime.utcnow)
