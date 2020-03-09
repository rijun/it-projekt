import setuptools
from distutils.core import setup

setup(
    name='itp',
    version='1.0.0',
    packages=setuptools.find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        "Flask>=1.1.1", "python-dateutil>=2.8.1", "python-dotenv>=0.12.0", "waitress>=1.4.3"
    ],
)
