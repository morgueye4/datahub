from setuptools import setup, find_packages

setup(
    name="datahub-client",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "web3>=6.0.0",
        "eth-account>=0.8.0",
        "requests>=2.25.0",
        "lighthouse-web3>=0.1.0",  # This is a placeholder, you'll need to create or use an actual Lighthouse SDK
    ],
    author="DataHub Team",
    author_email="info@datahub.ai",
    description="Python client for interacting with the DataHub platform",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/datahub/datahub-client",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
    ],
    python_requires=">=3.7",
    include_package_data=True,
    package_data={
        "datahub_client": ["abis/*.json"],
    },
)
